import PayoutTransaction from '../models/payout-transaction.model.js';

class PayoutTransactionRepository {
    create(payload) {
        return PayoutTransaction.create(payload);
    }

    updateById(id, patch) {
        return PayoutTransaction.findByIdAndUpdate(
            id,
            { $set: patch },
            { new: true }
        );
    }

    async getTotalSuccessfulBySeller(sellerId) {
        const rows = await PayoutTransaction.aggregate([
            {
                $match: {
                    sellerId,
                    status: 'paid',
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                },
            },
        ]);

        return Number(rows?.[0]?.total || 0);
    }

    async getTotalPendingBySeller(sellerId) {
        const rows = await PayoutTransaction.aggregate([
            {
                $match: {
                    sellerId,
                    status: 'pending',
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                },
            },
        ]);

        return Number(rows?.[0]?.total || 0);
    }

    listBySeller(sellerId, limit = 10) {
        return PayoutTransaction.find({ sellerId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
    }
}

export default new PayoutTransactionRepository();
