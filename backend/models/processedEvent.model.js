module.exports = (sequelize, DataTypes) => {
  const ProcessedEvent = sequelize.define('ProcessedEvent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    eventId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'The unique ID of the domain event'
    },
    processorName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'The name of the consumer processing this event (e.g., PayablesWorker)'
    },
    topic: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    CompanyId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    processedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    timestamps: true,

    indexes: [
      {
        unique: true,
        fields: ['CompanyId', 'eventId', 'processorName'],
        name: 'unique_processed_event_per_consumer'
      },
      {
        fields: ['CompanyId']
      }
    ]
  });

  ProcessedEvent.associate = (models) => {
    ProcessedEvent.belongsTo(models.Company, { foreignKey: 'CompanyId' });
  };

  return ProcessedEvent;
};
