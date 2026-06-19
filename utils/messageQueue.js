const queue = [];

function addToQueue(item) {

    queue.push({

        ...item,

        createdAt:
            new Date(),

        attempts:
            0,
    });
}

function getQueue() {

    return queue;
}

function removeFromQueue(
    messageId
) {

    const index =
        queue.findIndex(

            (item) =>

                item.messageId ===
                messageId
        );

    if (
        index !== -1
    ) {

        queue.splice(
            index,
            1
        );
    }
}

function incrementAttempts(
    messageId
) {

    const item =
        queue.find(

            (q) =>

                q.messageId ===
                messageId
        );

    if (
        item
    ) {

        item.attempts += 1;
    }
}

module.exports = {

    addToQueue,

    getQueue,

    removeFromQueue,

    incrementAttempts,
};