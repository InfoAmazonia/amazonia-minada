import { getQueueItem } from "./models.mjs";

export async function addItem(sub, key, item) {
    const queueItemModel = getQueueItem(sub);
    await queueItemModel.create({ key, data: item });
}

export async function popItem(sub, lockTimeoutMs = 60000) {
    const now = new Date();
    const lockDeadline = new Date(now.getTime() - lockTimeoutMs);
    const queueItemModel = getQueueItem(sub);

    const item = await queueItemModel.findOneAndUpdate(
        {
            $or: [
                { status: 'pending' },
                { status: 'processing', lockedAt: { $lt: lockDeadline } }
            ]
        },
        {
            $set: { status: 'processing', lockedAt: now }
        },
        {
            sort: { createdAt: 1 }, // FIFO
            new: true
        }
    );

    return item;
}

export async function updateItemStatus(sub, itemId, status) {
    const queueItemModel = getQueueItem(sub);
    await queueItemModel.findByIdAndUpdate(itemId, {
        $set: { status: status, updatedAt: new Date() }
    });
}