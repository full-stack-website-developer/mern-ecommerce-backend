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
}

export default new UserRepository();