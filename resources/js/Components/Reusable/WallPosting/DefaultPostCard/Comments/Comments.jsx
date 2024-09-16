import { useState } from "react";

import Comment from "../../Comment";

export function Comments({ comments, onCommentsOpen }) {
    const commentsCount = comments.length;

    return (
        <>
            <img
                src="/assets/commentforposting.svg"
                alt="Comment"
                className="w-6 h-6 cursor-pointer"
                onClick={onCommentsOpen}
            />
            {commentsCount > 0 && (
                <span className="text-sm font-medium">{commentsCount}</span>
            )}
        </>
    );
}
