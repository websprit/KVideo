import { useState, useEffect, useCallback, useRef } from 'react';
import { Tag } from '@/components/home/SortableTag';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { PREMIUM_STORAGE_KEY } from '@/lib/constants/premium-tags';
import { settingsStore } from '@/lib/store/settings-store';

export function usePremiumTagManager() {
    const [tags, setTags] = useState<Tag[]>([]);
    const [selectedTag, setSelectedTag] = useState('recommend');
    const [showTagManager, setShowTagManager] = useState(false);
    const [newTagInput, setNewTagInput] = useState('');
    const [justAddedTag, setJustAddedTag] = useState(false);
    const [loading, setLoading] = useState(true);
    const sourceCountRef = useRef(0);
    const isFetchingRef = useRef(false);

    const fetchTags = useCallback(async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        try {
            setLoading(true);
            const settings = settingsStore.getSettings();
            const enabledSources = settings.premiumSources.filter(s => s.enabled);

            const response = await fetch('/api/premium/types', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sources: enabledSources
                })
            });

            const data = await response.json();

            if (data.tags && Array.isArray(data.tags)) {
                // Load saved order from local storage
                const savedTagsJson = localStorage.getItem(PREMIUM_STORAGE_KEY);
                if (savedTagsJson) {
                    try {
                        const savedTags = JSON.parse(savedTagsJson);
                        const apiTagMap = new Map<string, Tag>();
                        if (Array.isArray(data.tags)) {
                            data.tags.forEach((t: Tag) => apiTagMap.set(t.id, t));
                        }

                        const mergedTags: Tag[] = [];
                        const processedIds = new Set<string>();

                        if (Array.isArray(savedTags)) {
                            savedTags.forEach((savedTag: Tag) => {
                                if (apiTagMap.has(savedTag.id)) {
                                    mergedTags.push(apiTagMap.get(savedTag.id)!);
                                    processedIds.add(savedTag.id);
                                }
                            });
                        }

                        data.tags.forEach((tag: Tag) => {
                            if (!processedIds.has(tag.id)) {
                                mergedTags.push(tag);
                            }
                        });

                        setTags(mergedTags);
                    } catch (e) {
                        console.error('Failed to parse saved tags', e);
                        setTags(data.tags);
                    }
                } else {
                    setTags(data.tags);
                }
            }
        } catch (error) {
            console.error('Failed to fetch premium tags:', error);
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        const settings = settingsStore.getSettings();
        sourceCountRef.current = settings.premiumSources.filter(s => s.enabled).length;
        fetchTags();
    }, [fetchTags]);

    // Subscribe to settings changes — re-fetch tags when premiumSources change
    // This handles the case where subscription sync loads sources after initial mount
    useEffect(() => {
        const unsubscribe = settingsStore.subscribe(() => {
            const settings = settingsStore.getSettings();
            const newCount = settings.premiumSources.filter(s => s.enabled).length;
            if (newCount !== sourceCountRef.current && newCount > 0) {
                sourceCountRef.current = newCount;
                fetchTags();
            }
        });
        return () => unsubscribe();
    }, [fetchTags]);

    // Save tags to local storage whenever they change
    useEffect(() => {
        if (tags.length > 0 && !loading) {
            localStorage.setItem(PREMIUM_STORAGE_KEY, JSON.stringify(tags));
        }
    }, [tags, loading]);

    const handleAddTag = () => {
        // Custom tag adding is disabled for dynamic tags mode as we fetch all available tags
        // But we keep the function signature for compatibility
    };

    const handleDeleteTag = (tagId: string) => {
        // Instead of deleting, we could hide it, but for now let's just remove it from the list
        // It will reappear if local storage is cleared or if we implement a "hidden tags" feature
        // For now, simple removal from current view
        const newTags = tags.filter((t) => t.id !== tagId);
        setTags(newTags);

        if (selectedTag === tagId) {
            setSelectedTag(newTags[0]?.id || '');
        }
    };

    const handleRestoreDefaults = async () => {
        setLoading(true);
        localStorage.removeItem(PREMIUM_STORAGE_KEY);
        try {
            const response = await fetch('/api/premium/types');
            const data = await response.json();
            if (data.tags) {
                setTags(data.tags);
                setSelectedTag('recommend');
            }
        } catch (error) {
            console.error('Failed to restore tags:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setTags((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    return {
        tags,
        selectedTag,
        newTagInput,
        showTagManager,
        justAddedTag,
        loading,
        setSelectedTag,
        setNewTagInput,
        setShowTagManager,
        setJustAddedTag,
        handleAddTag,
        handleDeleteTag,
        handleRestoreDefaults,
        handleDragEnd,
    };
}
