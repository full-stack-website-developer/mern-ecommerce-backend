import { AddressResponseDto } from "./address.dto.js";

class UserResponseDto {
    static fromUser(user) {
        return {
            id: user._id,
            avatar: user.avatar,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            phone: user.phone,
            bio: user.bio,
            addresses: Array.isArray(user.addresses)
                ? user.addresses.map(AddressResponseDto.fromAddress)
                : [],
            setPassword: user.setPassword, 
        }
    }
}

class CreateUserDto {
    constructor({ firstName, lastName, email, password, phone, terms }) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.password = password;
        this.phone = phone;
        this.terms = terms;
    }
}

export { UserResponseDto, CreateUserDto };
