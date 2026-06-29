import bcrypt from "bcrypt";

const toId = (value) => value?.toString?.() ?? value;

const withId = (record) => {
    if (!record) return record;

    return {
        ...record,
        _id: record.id,
    };
};

const toPublicUser = (user) => {
    if (!user) return user;

    const mapped = withId(user);
    delete mapped.password;
    return mapped;
};

const attachUserMethods = (user) => {
    if (!user) return user;

    return {
        ...user,
        isPasswordCorrect(candidatePassword) {
            if (!user.password) return false;
            return bcrypt.compare(candidatePassword, user.password);
        },
    };
};

const toOwner = (user) => {
    if (!user) return user;

    return {
        _id: user.id,
        username: user.username,
        fullName: user.fullName,
        avatar: user.avatar,
    };
};

const toVideo = (video) => {
    if (!video) return video;

    const mapped = withId({
        ...video,
        owner: video.owner ? toOwner(video.owner) : video.ownerId,
    });

    delete mapped.ownerId;
    delete mapped.likes;
    delete mapped.comments;
    delete mapped.playlists;
    delete mapped.watchHistory;
    delete mapped._count;
    return mapped;
};

const toComment = (comment) => {
    if (!comment) return comment;

    const mapped = withId({
        ...comment,
        owner: comment.owner ? toOwner(comment.owner) : comment.ownerId,
    });

    delete mapped.ownerId;
    delete mapped.videoId;
    delete mapped.likes;
    delete mapped._count;
    return mapped;
};

const toPlaylist = (playlist) => {
    if (!playlist) return playlist;

    const videos = playlist.videos?.map((entry) =>
        entry.video ? toVideo(entry.video) : toVideo(entry)
    );
    const mapped = withId({
        ...playlist,
        owner: playlist.owner ? toOwner(playlist.owner) : playlist.ownerId,
        videos,
    });

    delete mapped.ownerId;
    delete mapped._count;
    return mapped;
};

const getTargetField = (field) => {
    const fields = {
        video: "videoId",
        comment: "commentId",
        tweet: "tweetId",
    };

    return fields[field] || field;
};

const normalizeMongoUpdate = (updateData) => updateData?.$set ?? updateData;

export {
    attachUserMethods,
    getTargetField,
    normalizeMongoUpdate,
    toComment,
    toId,
    toOwner,
    toPlaylist,
    toPublicUser,
    toVideo,
    withId,
};
