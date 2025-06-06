/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

// Import Routes

import { Route as rootRoute } from './app/routes/__root'
import { Route as RegisterImport } from './app/routes/register'
import { Route as ProfileImport } from './app/routes/profile'
import { Route as LoginImport } from './app/routes/login'
import { Route as AdminImport } from './app/routes/admin'
import { Route as IndexImport } from './app/routes/index'
import { Route as AdminIndexImport } from './app/routes/admin.index'
import { Route as TopicsNewImport } from './app/routes/topics.new'
import { Route as CategoriesCategoryIdImport } from './app/routes/categories.$categoryId'
import { Route as AdminUsersImport } from './app/routes/admin.users'
import { Route as CategoriesCategoryIdIndexImport } from './app/routes/categories.$categoryId.index'
import { Route as CategoriesCategoryIdTopicsNewImport } from './app/routes/categories.$categoryId.topics.new'
import { Route as CategoriesCategoryIdTopicsTopicIdImport } from './app/routes/categories.$categoryId.topics.$topicId'

// Create/Update Routes

const RegisterRoute = RegisterImport.update({
  id: '/register',
  path: '/register',
  getParentRoute: () => rootRoute,
} as any)

const ProfileRoute = ProfileImport.update({
  id: '/profile',
  path: '/profile',
  getParentRoute: () => rootRoute,
} as any)

const LoginRoute = LoginImport.update({
  id: '/login',
  path: '/login',
  getParentRoute: () => rootRoute,
} as any)

const AdminRoute = AdminImport.update({
  id: '/admin',
  path: '/admin',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const AdminIndexRoute = AdminIndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => AdminRoute,
} as any)

const TopicsNewRoute = TopicsNewImport.update({
  id: '/topics/new',
  path: '/topics/new',
  getParentRoute: () => rootRoute,
} as any)

const CategoriesCategoryIdRoute = CategoriesCategoryIdImport.update({
  id: '/categories/$categoryId',
  path: '/categories/$categoryId',
  getParentRoute: () => rootRoute,
} as any)

const AdminUsersRoute = AdminUsersImport.update({
  id: '/users',
  path: '/users',
  getParentRoute: () => AdminRoute,
} as any)

const CategoriesCategoryIdIndexRoute = CategoriesCategoryIdIndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => CategoriesCategoryIdRoute,
} as any)

const CategoriesCategoryIdTopicsNewRoute =
  CategoriesCategoryIdTopicsNewImport.update({
    id: '/topics/new',
    path: '/topics/new',
    getParentRoute: () => CategoriesCategoryIdRoute,
  } as any)

const CategoriesCategoryIdTopicsTopicIdRoute =
  CategoriesCategoryIdTopicsTopicIdImport.update({
    id: '/topics/$topicId',
    path: '/topics/$topicId',
    getParentRoute: () => CategoriesCategoryIdRoute,
  } as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/admin': {
      id: '/admin'
      path: '/admin'
      fullPath: '/admin'
      preLoaderRoute: typeof AdminImport
      parentRoute: typeof rootRoute
    }
    '/login': {
      id: '/login'
      path: '/login'
      fullPath: '/login'
      preLoaderRoute: typeof LoginImport
      parentRoute: typeof rootRoute
    }
    '/profile': {
      id: '/profile'
      path: '/profile'
      fullPath: '/profile'
      preLoaderRoute: typeof ProfileImport
      parentRoute: typeof rootRoute
    }
    '/register': {
      id: '/register'
      path: '/register'
      fullPath: '/register'
      preLoaderRoute: typeof RegisterImport
      parentRoute: typeof rootRoute
    }
    '/admin/users': {
      id: '/admin/users'
      path: '/users'
      fullPath: '/admin/users'
      preLoaderRoute: typeof AdminUsersImport
      parentRoute: typeof AdminImport
    }
    '/categories/$categoryId': {
      id: '/categories/$categoryId'
      path: '/categories/$categoryId'
      fullPath: '/categories/$categoryId'
      preLoaderRoute: typeof CategoriesCategoryIdImport
      parentRoute: typeof rootRoute
    }
    '/topics/new': {
      id: '/topics/new'
      path: '/topics/new'
      fullPath: '/topics/new'
      preLoaderRoute: typeof TopicsNewImport
      parentRoute: typeof rootRoute
    }
    '/admin/': {
      id: '/admin/'
      path: '/'
      fullPath: '/admin/'
      preLoaderRoute: typeof AdminIndexImport
      parentRoute: typeof AdminImport
    }
    '/categories/$categoryId/': {
      id: '/categories/$categoryId/'
      path: '/'
      fullPath: '/categories/$categoryId/'
      preLoaderRoute: typeof CategoriesCategoryIdIndexImport
      parentRoute: typeof CategoriesCategoryIdImport
    }
    '/categories/$categoryId/topics/$topicId': {
      id: '/categories/$categoryId/topics/$topicId'
      path: '/topics/$topicId'
      fullPath: '/categories/$categoryId/topics/$topicId'
      preLoaderRoute: typeof CategoriesCategoryIdTopicsTopicIdImport
      parentRoute: typeof CategoriesCategoryIdImport
    }
    '/categories/$categoryId/topics/new': {
      id: '/categories/$categoryId/topics/new'
      path: '/topics/new'
      fullPath: '/categories/$categoryId/topics/new'
      preLoaderRoute: typeof CategoriesCategoryIdTopicsNewImport
      parentRoute: typeof CategoriesCategoryIdImport
    }
  }
}

// Create and export the route tree

interface AdminRouteChildren {
  AdminUsersRoute: typeof AdminUsersRoute
  AdminIndexRoute: typeof AdminIndexRoute
}

const AdminRouteChildren: AdminRouteChildren = {
  AdminUsersRoute: AdminUsersRoute,
  AdminIndexRoute: AdminIndexRoute,
}

const AdminRouteWithChildren = AdminRoute._addFileChildren(AdminRouteChildren)

interface CategoriesCategoryIdRouteChildren {
  CategoriesCategoryIdIndexRoute: typeof CategoriesCategoryIdIndexRoute
  CategoriesCategoryIdTopicsTopicIdRoute: typeof CategoriesCategoryIdTopicsTopicIdRoute
  CategoriesCategoryIdTopicsNewRoute: typeof CategoriesCategoryIdTopicsNewRoute
}

const CategoriesCategoryIdRouteChildren: CategoriesCategoryIdRouteChildren = {
  CategoriesCategoryIdIndexRoute: CategoriesCategoryIdIndexRoute,
  CategoriesCategoryIdTopicsTopicIdRoute:
    CategoriesCategoryIdTopicsTopicIdRoute,
  CategoriesCategoryIdTopicsNewRoute: CategoriesCategoryIdTopicsNewRoute,
}

const CategoriesCategoryIdRouteWithChildren =
  CategoriesCategoryIdRoute._addFileChildren(CategoriesCategoryIdRouteChildren)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/admin': typeof AdminRouteWithChildren
  '/login': typeof LoginRoute
  '/profile': typeof ProfileRoute
  '/register': typeof RegisterRoute
  '/admin/users': typeof AdminUsersRoute
  '/categories/$categoryId': typeof CategoriesCategoryIdRouteWithChildren
  '/topics/new': typeof TopicsNewRoute
  '/admin/': typeof AdminIndexRoute
  '/categories/$categoryId/': typeof CategoriesCategoryIdIndexRoute
  '/categories/$categoryId/topics/$topicId': typeof CategoriesCategoryIdTopicsTopicIdRoute
  '/categories/$categoryId/topics/new': typeof CategoriesCategoryIdTopicsNewRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/login': typeof LoginRoute
  '/profile': typeof ProfileRoute
  '/register': typeof RegisterRoute
  '/admin/users': typeof AdminUsersRoute
  '/topics/new': typeof TopicsNewRoute
  '/admin': typeof AdminIndexRoute
  '/categories/$categoryId': typeof CategoriesCategoryIdIndexRoute
  '/categories/$categoryId/topics/$topicId': typeof CategoriesCategoryIdTopicsTopicIdRoute
  '/categories/$categoryId/topics/new': typeof CategoriesCategoryIdTopicsNewRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexRoute
  '/admin': typeof AdminRouteWithChildren
  '/login': typeof LoginRoute
  '/profile': typeof ProfileRoute
  '/register': typeof RegisterRoute
  '/admin/users': typeof AdminUsersRoute
  '/categories/$categoryId': typeof CategoriesCategoryIdRouteWithChildren
  '/topics/new': typeof TopicsNewRoute
  '/admin/': typeof AdminIndexRoute
  '/categories/$categoryId/': typeof CategoriesCategoryIdIndexRoute
  '/categories/$categoryId/topics/$topicId': typeof CategoriesCategoryIdTopicsTopicIdRoute
  '/categories/$categoryId/topics/new': typeof CategoriesCategoryIdTopicsNewRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | '/admin'
    | '/login'
    | '/profile'
    | '/register'
    | '/admin/users'
    | '/categories/$categoryId'
    | '/topics/new'
    | '/admin/'
    | '/categories/$categoryId/'
    | '/categories/$categoryId/topics/$topicId'
    | '/categories/$categoryId/topics/new'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/'
    | '/login'
    | '/profile'
    | '/register'
    | '/admin/users'
    | '/topics/new'
    | '/admin'
    | '/categories/$categoryId'
    | '/categories/$categoryId/topics/$topicId'
    | '/categories/$categoryId/topics/new'
  id:
    | '__root__'
    | '/'
    | '/admin'
    | '/login'
    | '/profile'
    | '/register'
    | '/admin/users'
    | '/categories/$categoryId'
    | '/topics/new'
    | '/admin/'
    | '/categories/$categoryId/'
    | '/categories/$categoryId/topics/$topicId'
    | '/categories/$categoryId/topics/new'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  AdminRoute: typeof AdminRouteWithChildren
  LoginRoute: typeof LoginRoute
  ProfileRoute: typeof ProfileRoute
  RegisterRoute: typeof RegisterRoute
  CategoriesCategoryIdRoute: typeof CategoriesCategoryIdRouteWithChildren
  TopicsNewRoute: typeof TopicsNewRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  AdminRoute: AdminRouteWithChildren,
  LoginRoute: LoginRoute,
  ProfileRoute: ProfileRoute,
  RegisterRoute: RegisterRoute,
  CategoriesCategoryIdRoute: CategoriesCategoryIdRouteWithChildren,
  TopicsNewRoute: TopicsNewRoute,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/admin",
        "/login",
        "/profile",
        "/register",
        "/categories/$categoryId",
        "/topics/new"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/admin": {
      "filePath": "admin.tsx",
      "children": [
        "/admin/users",
        "/admin/"
      ]
    },
    "/login": {
      "filePath": "login.tsx"
    },
    "/profile": {
      "filePath": "profile.tsx"
    },
    "/register": {
      "filePath": "register.tsx"
    },
    "/admin/users": {
      "filePath": "admin.users.tsx",
      "parent": "/admin"
    },
    "/categories/$categoryId": {
      "filePath": "categories.$categoryId.tsx",
      "children": [
        "/categories/$categoryId/",
        "/categories/$categoryId/topics/$topicId",
        "/categories/$categoryId/topics/new"
      ]
    },
    "/topics/new": {
      "filePath": "topics.new.tsx"
    },
    "/admin/": {
      "filePath": "admin.index.tsx",
      "parent": "/admin"
    },
    "/categories/$categoryId/": {
      "filePath": "categories.$categoryId.index.tsx",
      "parent": "/categories/$categoryId"
    },
    "/categories/$categoryId/topics/$topicId": {
      "filePath": "categories.$categoryId.topics.$topicId.tsx",
      "parent": "/categories/$categoryId"
    },
    "/categories/$categoryId/topics/new": {
      "filePath": "categories.$categoryId.topics.new.tsx",
      "parent": "/categories/$categoryId"
    }
  }
}
ROUTE_MANIFEST_END */
