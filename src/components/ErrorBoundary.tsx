import React from 'react';
import { Card, CardBody, Button } from '@heroui/react';
import { Icon } from '@iconify/react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 记录错误信息
    console.error('ErrorBoundary 捕获到错误:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // 这里可以将错误信息发送到错误报告服务
    // reportError(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="w-full max-w-md">
            <CardBody className="text-center p-8">
              <div className="mb-6">
                <Icon 
                  icon="solar:bug-minimalistic-bold-duotone" 
                  className="text-6xl text-red-500 mx-auto mb-4" 
                />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  哎呀，出错了！
                </h1>
                <p className="text-gray-600">
                  应用程序遇到了一个意外错误。我们已经记录了这个问题。
                </p>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 mb-2">
                    查看错误详情
                  </summary>
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-3 justify-center">
                <Button
                  variant="bordered"
                  onClick={this.handleReload}
                  startContent={<Icon icon="solar:refresh-bold-duotone" />}
                >
                  重新加载
                </Button>
                <Button
                  color="primary"
                  onClick={this.handleGoHome}
                  startContent={<Icon icon="solar:home-bold-duotone" />}
                >
                  返回首页
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
