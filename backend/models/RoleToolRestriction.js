import mongoose from 'mongoose';

const RoleToolRestrictionSchema = new mongoose.Schema({
    role: {
        type: String,
        required: [true, 'Role is required'],
        unique: true,
        enum: ['user', 'technician', 'radiologist', 'admin', 'qa', 'institution'],
        index: true
    },
    allowedTools: {
        type: [String],
        default: []
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

// Static method to get formatted restrictions object
RoleToolRestrictionSchema.statics.getFormattedRestrictions = async function() {
    const restrictions = await this.find();
    return restrictions.reduce((acc, curr) => {
        acc[curr.role] = curr.allowedTools;
        return acc;
    }, {});
};

export default mongoose.model('RoleToolRestriction', RoleToolRestrictionSchema);
