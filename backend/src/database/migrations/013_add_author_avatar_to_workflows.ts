import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('workflows', (table) => {
    table.string('authorAvatar').nullable(); // 作者头像URL
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('workflows', (table) => {
    table.dropColumn('authorAvatar');
  });
}
