import React from "react";
import { useContext } from "react";

import { PersonalWall } from "./PersonalWall";
import { useInfiniteScroll } from "./useInfiniteScroll";
import { UserWall } from "./UserWall";
import { WallContext } from "./WallContext";

import "./index.css";

function OutputData({
    loggedInUserId,
    filterType,
    filterId,
    communityId,
    departmentId,
    userId,
    postType,
}) {
    const { variant } = useContext(WallContext);

    const { posts, fetchData, hasMore } = useInfiniteScroll({
        variant,
        userId: userId,
        communityId,
        departmentId,
        loggedInUserId,
        filter: {
            filterId,
            filterType,
            postType,
        },
    });

    const renderWall = () => {
        switch (variant) {
            case "profile":
            case "user-wall":
                return (
                    <UserWall
                        posts={posts}
                        onLoad={fetchData}
                        hasMore={hasMore}
                        userId={userId}
                    />
                );
            case "community":
            case "department":
                return (
                    <PersonalWall
                        posts={posts}
                        onLoad={fetchData}
                        hasMore={hasMore}
                    />
                );
            case "dashboard":
            default:
                return (
                    <PersonalWall
                        posts={posts}
                        onLoad={fetchData}
                        hasMore={hasMore}
                    />
                );
        }
    };

    return (
        <>
            {/* <Polls polls={polls} /> */}

            {/* TODO: PersonalWall is used on communities page, which could trigger multiple loads */}
            {renderWall()}
        </>
    );
}

export default OutputData;
