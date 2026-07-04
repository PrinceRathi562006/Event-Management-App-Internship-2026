const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    // Basic Information
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: 5000,
    },

    theme: {
      type: String,
      default: "",
      trim: true,
    },

    agenda: [
      {
        type: String,
        trim: true,
      },
    ],

    learningOutcomes: [
      {
        type: String,
        trim: true,
      },
    ],

    requirements: [
      {
        type: String,
        trim: true,
      },
    ],

    timeline: [
      {
        time: {
          type: String,
          required: true,
        },
        title: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          default: "",
        },
      },
    ],

    category: {
      type: String,
      required: true,
      enum: [
        "Workshop",
        "Seminar",
        "Hackathon",
        "Technical",
        "Cultural",
        "Sports",
        "Placement",
        "Fest",
        "Competition",
        "Conference",
        "Other",
      ],
    },

    // Organizer
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedOrganizers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    organizerCoordinators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    studentCoordinators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Venue
    venue: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      default: "",
    },

    // Event Poster
    poster: {
      type: String,
      default: "",
    },

    posterPublicId: {
      type: String,
      default: "",
    },

    galleryImages: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          default: "",
        },
      },
    ],

    certificateSignature: {
      type: String,
      default: "",
    },

    certificateSignaturePublicId: {
      type: String,
      default: "",
    },

    partnerCompanies: [
      {
        name: {
          type: String,
          trim: true,
          required: true,
        },
      },
    ],

    badges: [
      {
        type: String,
        enum: ["Speaker", "Volunteer", "Winner", "Organizer", "Top Participant"],
      },
    ],

    speakers: [
      {
        image: {
          type: String,
          default: "",
        },
        imagePublicId: {
          type: String,
          default: "",
        },
        name: {
          type: String,
          required: true,
          trim: true,
        },
        designation: {
          type: String,
          default: "",
          trim: true,
        },
        company: {
          type: String,
          default: "",
          trim: true,
        },
        bio: {
          type: String,
          default: "",
        },
        linkedin: {
          type: String,
          default: "",
        },
        twitter: {
          type: String,
          default: "",
        },
      },
    ],

    // Event Dates
    eventDate: {
      type: Date,
      required: true,
    },

    registrationDeadline: {
      type: Date,
      required: true,
    },

    startTime: {
      type: String,
      required: true,
    },

    endTime: {
      type: String,
      required: true,
    },

    // Capacity
    totalSeats: {
      type: Number,
      required: true,
      min: 1,
    },

    availableSeats: {
      type: Number,
      required: true,
      min: 0,
    },

    // Pricing
    isPaid: {
      type: Boolean,
      default: false,
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Event Status
    status: {
      type: String,
      enum: [
        "Draft",
        "Pending",
        "Approved",
        "Rejected",
        "Completed",
        "Cancelled",
      ],
      default: "Pending",
    },

    // Visibility
    isPublished: {
      type: Boolean,
      default: false,
    },

    featured: {
      type: Boolean,
      default: false,
    },

    createdByRole: {
      type: String,
      enum: ["student", "organizer", "admin"],
      default: "organizer",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    approvalLogs: [
      {
        status: {
          type: String,
          enum: ["Pending", "Approved", "Rejected", "Completed", "Cancelled"],
          required: true,
        },
        by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        note: {
          type: String,
          default: "",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    updateHistory: [
      {
        by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        fields: [
          {
            type: String,
          },
        ],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Tags
    tags: [
      {
        type: String,
      },
    ],

    // Contact
    contactEmail: {
      type: String,
      default: "",
    },

    contactPhone: {
      type: String,
      default: "",
    },

    // Statistics
    totalRegistrations: {
      type: Number,
      default: 0,
    },

    totalAttendance: {
      type: Number,
      default: 0,
    },

    averageRating: {
      type: Number,
      default: 0,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// =============================
// Text Search Index
// =============================
eventSchema.index({
  title: "text",
  description: "text",
  category: "text",
  venue: "text",
});

module.exports = mongoose.model("Event", eventSchema);
