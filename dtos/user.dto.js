class UserResponseDto {
    static fromUser(user) {
        return {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            phone: user.phone,
            createdAt: user.createdAt
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
