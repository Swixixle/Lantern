/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Implements access control for:
 * - Lead Investigator: Full read/write access
 * - Reviewer: Read access + comment ability
 * - Auditor: Read-only + verification access
 */

import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

/**
 * User role definitions.
 */
export enum UserRole {
  LEAD_INVESTIGATOR = "lead_investigator",
  REVIEWER = "reviewer",
  AUDITOR = "auditor",
}

/**
 * Permission levels.
 */
export enum Permission {
  READ = "read",
  WRITE = "write",
  DELETE = "delete",
  VERIFY = "verify",
  COMMENT = "comment",
}

/**
 * Role-permission matrix.
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.LEAD_INVESTIGATOR]: [
    Permission.READ,
    Permission.WRITE,
    Permission.DELETE,
    Permission.VERIFY,
    Permission.COMMENT,
  ],
  [UserRole.REVIEWER]: [
    Permission.READ,
    Permission.COMMENT,
  ],
  [UserRole.AUDITOR]: [
    Permission.READ,
    Permission.VERIFY,
  ],
};

/**
 * Extended request with user info.
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
  };
}

/**
 * Check if user has a specific role for a case.
 * 
 * @param userId - User ID
 * @param caseId - Case ID (null for global role)
 * @param requiredRole - Required role
 * @returns True if user has the role
 */
export async function userHasRole(
  userId: string,
  caseId: string | null,
  requiredRole: UserRole
): Promise<boolean> {
  try {
    // Check case-specific role first
    if (caseId) {
      const caseRoles = await storage.db
        .select()
        .from(storage.schema.userRoles)
        .where(storage.and(
          storage.eq(storage.schema.userRoles.userId, userId),
          storage.eq(storage.schema.userRoles.caseId, caseId),
          storage.eq(storage.schema.userRoles.role, requiredRole)
        ));
      
      if (caseRoles.length > 0) {
        return true;
      }
    }
    
    // Check global role
    const globalRoles = await storage.db
      .select()
      .from(storage.schema.userRoles)
      .where(storage.and(
        storage.eq(storage.schema.userRoles.userId, userId),
        storage.isNull(storage.schema.userRoles.caseId),
        storage.eq(storage.schema.userRoles.role, requiredRole)
      ));
    
    return globalRoles.length > 0;
  } catch (error) {
    console.error("Error checking user role:", error);
    return false;
  }
}

/**
 * Get all roles for a user in a case.
 * 
 * @param userId - User ID
 * @param caseId - Case ID (null for global roles only)
 * @returns Array of roles
 */
export async function getUserRoles(
  userId: string,
  caseId: string | null
): Promise<UserRole[]> {
  try {
    let query = storage.db
      .select()
      .from(storage.schema.userRoles)
      .where(storage.eq(storage.schema.userRoles.userId, userId));
    
    if (caseId) {
      // Get both case-specific and global roles
      const roles = await storage.db
        .select()
        .from(storage.schema.userRoles)
        .where(storage.and(
          storage.eq(storage.schema.userRoles.userId, userId),
          storage.or(
            storage.eq(storage.schema.userRoles.caseId, caseId),
            storage.isNull(storage.schema.userRoles.caseId)
          )
        ));
      
      return roles.map(r => r.role as UserRole);
    } else {
      // Get only global roles
      const roles = await storage.db
        .select()
        .from(storage.schema.userRoles)
        .where(storage.and(
          storage.eq(storage.schema.userRoles.userId, userId),
          storage.isNull(storage.schema.userRoles.caseId)
        ));
      
      return roles.map(r => r.role as UserRole);
    }
  } catch (error) {
    console.error("Error getting user roles:", error);
    return [];
  }
}

/**
 * Check if user has a specific permission for a case.
 * 
 * @param userId - User ID
 * @param caseId - Case ID (null for global)
 * @param permission - Required permission
 * @returns True if user has the permission
 */
export async function userHasPermission(
  userId: string,
  caseId: string | null,
  permission: Permission
): Promise<boolean> {
  const roles = await getUserRoles(userId, caseId);
  
  for (const role of roles) {
    const permissions = ROLE_PERMISSIONS[role];
    if (permissions.includes(permission)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Middleware: Require specific role for route.
 * 
 * @param requiredRole - Role required to access route
 * @returns Express middleware
 */
export function requireRole(requiredRole: UserRole) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Extract caseId from params or body
    const caseId = req.params.caseId || req.body.caseId || null;
    
    const hasRole = await userHasRole(userId, caseId, requiredRole);
    
    if (!hasRole) {
      return res.status(403).json({
        error: "Insufficient permissions",
        required_role: requiredRole,
      });
    }
    
    next();
  };
}

/**
 * Middleware: Require specific permission for route.
 * 
 * @param requiredPermission - Permission required to access route
 * @returns Express middleware
 */
export function requirePermission(requiredPermission: Permission) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Extract caseId from params or body
    const caseId = req.params.caseId || req.body.caseId || null;
    
    const hasPermission = await userHasPermission(userId, caseId, requiredPermission);
    
    if (!hasPermission) {
      return res.status(403).json({
        error: "Insufficient permissions",
        required_permission: requiredPermission,
      });
    }
    
    next();
  };
}

/**
 * Middleware: Require any of the specified roles.
 * 
 * @param roles - Array of acceptable roles
 * @returns Express middleware
 */
export function requireAnyRole(...roles: UserRole[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const caseId = req.params.caseId || req.body.caseId || null;
    
    for (const role of roles) {
      const hasRole = await userHasRole(userId, caseId, role);
      if (hasRole) {
        return next();
      }
    }
    
    return res.status(403).json({
      error: "Insufficient permissions",
      required_roles: roles,
    });
  };
}

/**
 * Grant a role to a user.
 * 
 * @param userId - User to grant role to
 * @param role - Role to grant
 * @param caseId - Case ID (null for global)
 * @param grantedBy - User ID granting the role
 */
export async function grantRole(
  userId: string,
  role: UserRole,
  caseId: string | null,
  grantedBy: string
): Promise<void> {
  await storage.db
    .insert(storage.schema.userRoles)
    .values({
      userId,
      caseId,
      role,
      grantedBy,
    });
}

/**
 * Revoke a role from a user (soft delete).
 * 
 * @param userId - User to revoke role from
 * @param role - Role to revoke
 * @param caseId - Case ID (null for global)
 */
export async function revokeRole(
  userId: string,
  role: UserRole,
  caseId: string | null
): Promise<void> {
  // Note: We don't actually delete roles (append-only)
  // In production, add a "revoked_at" timestamp column
  // For now, this is a placeholder
  console.warn("Role revocation not implemented (append-only policy)");
}
