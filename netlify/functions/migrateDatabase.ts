// Utility function to call the migration endpoint
export const migrateDatabase = async (): Promise<void> => {
  try {
    const response = await fetch('/.netlify/functions/migrate-villages-table', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Migration failed');
    }

    const result = await response.json();
    console.log('Migration successful:', result.message);
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
};
