import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
	const hasWorkflows = await knex.schema.hasTable('workflows');
	if (hasWorkflows) {
		await knex.raw('CREATE INDEX IF NOT EXISTS workflows_status_index ON workflows(status)');
		await knex.raw('CREATE INDEX IF NOT EXISTS workflows_category_index ON workflows(category)');
		await knex.raw('CREATE INDEX IF NOT EXISTS workflows_subcategory_index ON workflows(subcategory)');
		await knex.raw('CREATE INDEX IF NOT EXISTS workflows_authorid_index ON workflows(authorId)');
		await knex.raw('CREATE INDEX IF NOT EXISTS workflows_sortorder_index ON workflows(sortOrder)');
		await knex.raw('CREATE INDEX IF NOT EXISTS workflows_createdat_index ON workflows(createdAt)');
		await knex.raw('CREATE INDEX IF NOT EXISTS workflows_updatedat_index ON workflows(updatedAt)');
		await knex.raw('CREATE INDEX IF NOT EXISTS workflows_publishedat_index ON workflows(publishedAt)');
	}

	const hasUploaded = await knex.schema.hasTable('uploaded_files');
	if (hasUploaded) {
		await knex.raw('CREATE INDEX IF NOT EXISTS uploaded_files_userid_index ON uploaded_files(userId)');
		await knex.raw('CREATE INDEX IF NOT EXISTS uploaded_files_createdat_index ON uploaded_files(createdAt)');
	}
}

export async function down(knex: Knex): Promise<void> {
	const hasWorkflows = await knex.schema.hasTable('workflows');
	if (hasWorkflows) {
		await knex.raw('DROP INDEX IF EXISTS workflows_status_index');
		await knex.raw('DROP INDEX IF EXISTS workflows_category_index');
		await knex.raw('DROP INDEX IF EXISTS workflows_subcategory_index');
		await knex.raw('DROP INDEX IF EXISTS workflows_authorid_index');
		await knex.raw('DROP INDEX IF EXISTS workflows_sortorder_index');
		await knex.raw('DROP INDEX IF EXISTS workflows_createdat_index');
		await knex.raw('DROP INDEX IF EXISTS workflows_updatedat_index');
		await knex.raw('DROP INDEX IF EXISTS workflows_publishedat_index');
	}
	const hasUploaded = await knex.schema.hasTable('uploaded_files');
	if (hasUploaded) {
		await knex.raw('DROP INDEX IF EXISTS uploaded_files_userid_index');
		await knex.raw('DROP INDEX IF EXISTS uploaded_files_createdat_index');
	}
}


