class AddressResponseDto {
    static fromAddress(address) {
        return {
            id: address._id,
            street: address.street,
            country: address.country,
            state: address.state,
            city: address.city,
            postalCode: address.postalCode,
        }
    }
}

export { AddressResponseDto };
