import addressRepository from "../repositories/address.repository.js";

class AddressService {
    async getUserAddresses(userId) {
        const addresses = await addressRepository.findAllByUserId(userId, 'shipping');

        return { addresses };
    };

}

export default new AddressService();