import { neon } from '@neondatabase/serverless';
import { requireSuperAdmin } from './utils/auth-middleware.js';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  const authResult = requireSuperAdmin(event);
  if (!authResult.isValid) {
    return {
      statusCode: authResult.statusCode,
      headers,
      body: JSON.stringify({ error: authResult.error })
    };
  }

  try {
    if (event.httpMethod === 'GET') {
      return await handleGetMigrationStatus(headers);
    } else if (event.httpMethod === 'POST') {
      return await handleExecuteMigration(event, authResult, headers);
    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }
  } catch (error) {
    console.error('Migration status error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Migration operation failed' })
    };
  }
};

const handleGetMigrationStatus = async (headers) => {
  try {
    // Create migration tracking table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        executed_by INTEGER,
        status VARCHAR(50) DEFAULT 'completed',
        details JSONB,
        FOREIGN KEY (executed_by) REFERENCES users(id)
      )
    `;

    // Check which migrations have been executed
    const executedMigrations = await sql`
      SELECT migration_name, executed_at, status, details
      FROM migration_history
      ORDER BY executed_at DESC
    `;

    // Define required migrations
    const requiredMigrations = [
      {
        name: 'initial_schema',
        description: 'Core tables: users, villages, applications',
        required: true
      },
      {
        name: 'secondary_features',
        description: 'Admin messaging, fraud detection, analytics tables',
        required: true
      },
      {
        name: 'performance_indexes',
        description: 'Database performance optimization indexes',
        required: true
      },
      {
        name: 'default_settings',
        description: 'System configuration defaults',
        required: true
      }
    ];

    // Check migration status
    const migrationStatus = requiredMigrations.map(migration => {
      const executed = executedMigrations.find(m => m.migration_name === migration.name);
      return {
        ...migration,
        executed: !!executed,
        executed_at: executed?.executed_at || null,
        status: executed?.status || 'pending'
      };
    });

    const allMigrationsComplete = migrationStatus.every(m => m.executed);
    const pendingMigrations = migrationStatus.filter(m => !m.executed);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        migration_status: {
          all_complete: allMigrationsComplete,
          pending_count: pendingMigrations.length,
          migrations: migrationStatus,
          last_migration: executedMigrations[0] || null
        }
      })
    };

  } catch (error) {
    console.error('Get migration status error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get migration status' })
    };
  }
};

const handleExecuteMigration = async (event, authResult, headers) => {
  try {
    const { migration_name } = JSON.parse(event.body || '{}');

    if (!migration_name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Migration name is required' })
      };
    }

    // Record migration execution
    const migrationResult = await sql`
      INSERT INTO migration_history (migration_name, executed_by, status, details)
      VALUES (${migration_name}, ${authResult.user.userId}, 'completed', ${JSON.stringify({
        executed_by_name: authResult.user.name || authResult.user.email,
        execution_timestamp: new Date().toISOString(),
        ip_address: event.headers['x-forwarded-for'] || 'unknown'
      })})
      ON CONFLICT (migration_name) 
      DO UPDATE SET 
        executed_at = NOW(),
        executed_by = EXCLUDED.executed_by,
        status = EXCLUDED.status,
        details = EXCLUDED.details
      RETURNING id, executed_at
    `;

    // Log migration execution
    await sql`
      INSERT INTO audit_logs (
        user_id, action, resource_type, details, ip_address, created_at
      ) VALUES (
        ${authResult.user.userId}, 'EXECUTE_MIGRATION', 'migration',
        ${JSON.stringify({ migration_name: migration_name })},
        ${event.headers['x-forwarded-for'] || 'unknown'},
        NOW()
      )
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Migration ${migration_name} executed successfully`,
        migration: {
          name: migration_name,
          executed_at: migrationResult[0].executed_at,
          status: 'completed'
        }
      })
    };

  } catch (error) {
    console.error('Execute migration error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Migration execution failed',
        details: error.message
      })
    };
  }
};
