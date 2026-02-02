import Address from '../models/address.model.js';

class AddressRepository {
    async create(address) {
        return await Address.create(address);
    }
    
    async findById(id) {
        return await Address.findById(id);
    }
    
    async findByUserId(userId) {
        return await Address.findOne({ userId });
    }

    async save(address) {
        return await address.create();
    }

    async update(id, address) {
        return await Address.findByIdAndUpdate(
            id, 
            { $set: address }, 
            { new: true, runValidators: true}
        );
    }
}

export default new AddressRepository();