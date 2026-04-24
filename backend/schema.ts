import { list } from '@keystone-6/core';
import {
  text,
  relationship,
  password,
  checkbox, 
} from '@keystone-6/core/fields';

import { type Lists } from '.keystone/types';

const isLoggedIn = ({ session }: { session?: { data: any } }) => !!session?.data;

const isAdmin = ({ session }: { session?: { data: any } }) => session?.data.id == "cmo04erh00000bmgkyjqxhq6c";

export const lists = {
  User: list({
  access: {
      operation: {
        create: isAdmin,
        query: isLoggedIn,
        update: isLoggedIn,
        delete: isAdmin
      },
      filter: {
        query: ({ session }) => isAdmin({ session }) ? {} : { id: { equals: session.data.id } }
      },
      item: {
        update: ({ session, item }) => session?.data.id === item.id || isAdmin({ session }),
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
        query: isLoggedIn,
        create: isLoggedIn,
        update: isLoggedIn,
        delete: isLoggedIn,
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