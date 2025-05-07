import mongoose from 'mongoose'
mongoose.connect(process.env["GENEZIO_CRM_DATABASE_URL"]);

const userSchema = new mongoose.Schema({
    userId: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
  });
  
  const Users = mongoose.model('User', userSchema);
  
  const userSummarySchema = new mongoose.Schema({
    id: String,
    name: String,
    email: String,
  }, {
    timestamps: true
  });
  
  const employeeSchema = new mongoose.Schema({
    id: String,
    name: String,
    role: String,
    email: String,
    phone: String,
    meetings: [String],
  }, {
    timestamps: true
  });
  
  const actionItemSchema = new mongoose.Schema({
    id: String,
    title: String,
    dueDate: Date,
    completed: Boolean,
    completedAt: Date,
    interactionId: String,
  }, {
    timestamps: true
  });
  
  const interactionSchema = new mongoose.Schema({
    id: String,
    type: {
      type: String,
    },
    timestamp: Date,
    createdBy: userSummarySchema,
    title: String,
    description: String,
    metadata: {
      meetingId: String,
      duration: Number,
      attendees: [String],
    },
    actionItems: [actionItemSchema],
    isSticky: Boolean,
  }, {
    timestamps: true
  });
  
  const metricsSchema = new mongoose.Schema({
    contractValue: Number,
    probability: Number,
  });
  
  const accountSchema = new mongoose.Schema({
    id: {
      type: String,
      required: true,
      unique: true,
    },
    name: String,
    description: String,
    industry: String,
    website: String,
    status: {
      type: String,
      default: 'prospect',
    },
    owner: userSummarySchema,
    teamMembers: {
        type: [userSummarySchema],
        default: [],
    },
    employees: {
        type: [employeeSchema],
        default: [],
    },
    interactions: {
        type: [interactionSchema],
        default: [],
    },
    metrics: metricsSchema,
  }, {
    timestamps: true
  });
  
  const Accounts = mongoose.model('Account', accountSchema);

  export { Users, Accounts };

