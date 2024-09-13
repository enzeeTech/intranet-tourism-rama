import { useRef } from "react";
import { useEffect, useState } from "react";
import axios from "axios";

const postsPerScroll = 5;

export function useInfiniteScroll({
    userId,
    communityId,
    departmentId,
    filter,
}) {
    const [loading, setLoading] = useState(false);
    const [rawPosts, setRawPosts] = useState([]);
    const currentPage = useRef(1);
    const totalPages = useRef(-1);
    const [hasMore, setHasMore] = useState(true);

    const activeLoading = useRef(false);

    async function fetchData() {
        if (
            loading ||
            activeLoading.current ||
            (totalPages.current !== -1 && !hasMore)
        ) {
            return;
        }

        activeLoading.current = true;

        setLoading(true);
        try {
            const newFilter = [];

            if (filter) {
                if (filter.postType) {
                    if (filter.postType === "image") {
                        // add filter that matches part of the attachment mime_type
                        newFilter.push({
                            field: "attachments.mime_type",
                            type: "like",
                            value: "image/%",
                        });
                    }

                    if (filter.postType === "video") {
                        // add filter that matches part of the attachment mime_type
                        newFilter.push({
                            field: "attachments.mime_type",
                            type: "like",
                            value: "video/%",
                        });
                    }

                    if (filter.postType === "mention") {
                        newFilter.push({
                            field: "mentions",
                            value: userId,
                        });
                    }

                    if (filter.postType === "file") {
                        newFilter.push({
                            field: "attachments.extension",
                            type: "like",
                            value: ["pdf", "doc", "docx", "xls", "xlsx"],
                        });
                    }

                    if (filter.postType === "announcement") {
                        newFilter.push({
                            field: "announced",
                            type: "like",
                            value: "true",
                        });
                    }

                    if (filter.postType === "poll") {
                        newFilter.push({
                            field: "type",
                            type: "like",
                            value: "poll",
                        });
                    }
                }
            }

            if (userId) {
                newFilter.push({
                    field: "user_id",
                    type: "like",
                    value: userId,
                });
            }

            if (communityId) {
                newFilter.push({
                    field: "community_id",
                    type: "like",
                    value: communityId,
                });
            }

            if (departmentId) {
                newFilter.push({
                    field: "department_id",
                    type: "like",
                    value: departmentId,
                });
            }

            const postsResponse = await axios.get(`/api/posts/posts`, {
                params: {
                    with: [
                        "user",
                        "attachments",
                        "accessibilities",
                        "comments",
                        "poll",
                        "poll.question",
                        "poll.question.options",
                        "poll.responses",
                    ],
                    // TODO: return post type announcement first, then sort by updated_at
                    // sort: [{ updated_at: "desc" }],
                    page: currentPage.current,
                    paginate: true,
                    perpage: postsPerScroll,
                    limit: postsPerScroll,
                    offset: (currentPage.current - 1) * postsPerScroll,
                    user_id: userId,
                    filter: [
                        {
                            field: "type",
                            type: "like",
                            value: ["post", "birthday", "poll"],
                        },
                        ...newFilter,
                    ].filter(Boolean),
                },
            });

            if ([401, 403, 500].includes(postsResponse.status)) {
                throw new Error("Network response was not ok");
            }
            const postsData = postsResponse.data;

            const newPosts = postsData.data.data;
            setRawPosts((prev) => [...prev, ...newPosts]);

            currentPage.current += 1;
            totalPages.current = postsData.data.last_page;

            setHasMore(postsData.data.current_page < postsData.data.last_page);
        } catch (error) {
            console.error("Error fetching posts:", error);
        } finally {
            activeLoading.current = false;
            setLoading(false);
        }
    }

    useEffect(() => {
        setRawPosts([]);
        currentPage.current = 1;
        totalPages.current = -1;

        fetchData();
    }, [filter?.postType]);

    return {
        posts: rawPosts,
        loading,
        fetchData,
        hasMore,
    };
}
