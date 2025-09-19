import { Request, Response, NextFunction } from 'express';

// API版本控制中间件
export function apiVersion(supportedVersions: string[] = ['v1']) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const version = req.headers['api-version'] as string || 'v1';
    
    if (!supportedVersions.includes(version)) {
      res.status(400).json({
        success: false,
        error: `不支持的API版本: ${version}`,
        code: 'UNSUPPORTED_API_VERSION',
        supportedVersions
      });
      return;
    }
    
    req.apiVersion = version;
    res.setHeader('API-Version', version);
    next();
  };
}

// 废弃API警告
export function deprecationWarning(message: string, sunsetDate?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Warning', `299 - "Deprecated: ${message}"`);
    
    if (sunsetDate) {
      res.setHeader('Sunset', sunsetDate);
    }
    
    console.warn(`Deprecated API accessed: ${req.method} ${req.path} - ${message}`);
    next();
  };
}

// 扩展Request类型
declare global {
  namespace Express {
    interface Request {
      apiVersion?: string;
    }
  }
}
