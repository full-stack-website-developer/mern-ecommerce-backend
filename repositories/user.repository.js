import User from '../models/user.model.js';

class UserRepository {
    async create(userData) {
        return await User.create(userData);
    }

    async findByEmail(email) {
        return await User.findOne({email}).select('+password');
    }

    async findById(id, { withAddresses = false, withPassword = false } = {}) {
        const query = User.findById(id);

        if (withAddresses) {
            query.populate('addresses');
        }

        if (withPassword) {
            query.select('+password');
        }

        return await query;
    }

    async save(user) {
        return await user.save();
    }

    async update(id, value) {
        return await User.findByIdAndUpdate(
            id, 
            { $set: value }, 
            { new: true, runValidators: true}
        );
    }

    async listWithFilters({ page = 1, limit = 10, role, status, search } = {}) {
        const filter = {};

        if (role && role !== 'all') {
            filter.role = role;
        }

        if (status && status !== 'all') {
            filter.isActive = status === 'active';
        }

        if (search) {
            const regex = new RegExp(search, 'i');
            filter.$or = [
                { firstName: regex },
                { lastName: regex },
                { email: regex },
            ];
        }

        const skip = (page - 1) * limit;
        const total = await User.countDocuments(filter);
        const users = await User.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-password');

        return {
            users,
            total,
            page,
            totalPages: Math.ceil(total / limit) || 1,
        };
    }
}

export default new UserRepository();