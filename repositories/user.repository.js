import User from '../models/user.model.js';

class UserRepository {
    async create(userData) {
        return await User.create(userData);
    }

    async findByEmail(email) {
        return await User.findOne({email}).select('+password');
    }

    async findById(id) {
        return await User.findById(id).select('-password');
    }

    async save(user) {
        return await user.save();
    }
}

export default new UserRepository();