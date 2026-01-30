import { ValidationError } from '../utils/errors.util.js';

const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path[0],
                message: detail.message
            }));
            throw new ValidationError('Validation failed', errors);
        }

        req.body = value; // Use validated/sanitized data
        next();
    };
};

export { validate };