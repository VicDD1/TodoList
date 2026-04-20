import { list } from '@keystone-6/core';
import {
  text,
  relationship,
  password,
  checkbox, 
} from '@keystone-6/core/fields';

import { type Lists } from '.keystone/types';

const isAdmin = ({ session }: { session?: { data: any } }) => !!session?.data;

export const lists = {
  User: list({
  access: {
      operation: {
        query: isAdmin,
        create: isAdmin, 
        update: isAdmin,
        delete: isAdmin,
      },
      item: {
        update: ({ session, item }) => session?.data.id === item.id,
      }
    },
    fields: {
      name: text({ validation: { isRequired: true } }),
      email: text({
        validation: { isRequired: true },
        isIndexed: 'unique',
      }),
      password: password({ validation: { isRequired: true } }),
      
      tasks: relationship({ ref: 'Task.assignedTo', many: true }),
    },
  }),

  Task: list({
    access: {
      operation: {
        query: isAdmin,
        create: isAdmin,
        update: isAdmin,
        delete: isAdmin,
      }
    },
    fields: {
      label: text({ validation: { isRequired: true } }), 
      isComplete: checkbox({ defaultValue: false }),
      assignedTo: relationship({
        ref: 'User.tasks',
        many: false,
        ui: {
          displayMode: 'cards',
          cardFields: ['name', 'email'],
          inlineConnect: true,
        },
      }),
    },
  }),
} satisfies Lists;