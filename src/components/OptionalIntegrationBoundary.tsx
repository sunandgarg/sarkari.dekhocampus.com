import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  name: string;
};

export class OptionalIntegrationBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[OptionalIntegrationBoundary:${this.props.name}]`, error, info.componentStack);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
