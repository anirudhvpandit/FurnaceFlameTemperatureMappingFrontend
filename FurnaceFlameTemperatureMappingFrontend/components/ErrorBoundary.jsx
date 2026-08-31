// components/ErrorBoundary.jsx
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Error caught by boundary:', error, info);
    this.setState({ info });
    // Optionally send to Sentry
    // Sentry.captureException(error);
  }

  toggleDetails = () => {
    this.setState(prevState => ({ showDetails: !prevState.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconContainer}>
              <svg style={styles.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            <h1 style={styles.title}>Something went wrong</h1>
            
            <p style={styles.message}>
              {this.state.error?.message || 'An unexpected error occurred while processing your request.'}
            </p>
            
            <div style={styles.buttonContainer}>
              <button 
                onClick={() => window.location.reload()} 
                style={styles.primaryButton}
                onMouseEnter={(e) => e.target.style.background = styles.primaryButtonHover.background}
                onMouseLeave={(e) => e.target.style.background = styles.primaryButton.background}
              >
                Refresh Page
              </button>
              
              <button 
                onClick={this.toggleDetails}
                style={styles.secondaryButton}
                onMouseEnter={(e) => e.target.style.background = styles.secondaryButtonHover.background}
                onMouseLeave={(e) => e.target.style.background = styles.secondaryButton.background}
              >
                {this.state.showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            </div>

            {this.state.showDetails && (
              <div style={styles.detailsContainer}>
                <div style={styles.detailsSection}>
                  <h3 style={styles.detailsTitle}>Error</h3>
                  <pre style={styles.errorText}>
                    {this.state.error?.toString() || 'Unknown error'}
                  </pre>
                </div>
                
                {this.state.info && (
                  <div style={styles.detailsSection}>
                    <h3 style={styles.detailsTitle}>Component Stack</h3>
                    <pre style={styles.stackText}>
                      {this.state.info.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div style={styles.footer}>
            <p style={styles.footerText}>Furnace Flame Temperature Mapping System</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  card: {
    background: 'rgba(30, 41, 59, 0.8)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    padding: '48px 40px',
    maxWidth: '520px',
    width: '100%',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    animation: 'fadeIn 0.5s ease-out',
  },
  iconContainer: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
    boxShadow: '0 10px 40px -10px rgba(239, 68, 68, 0.5)',
  },
  icon: {
    width: '40px',
    height: '40px',
    color: '#fff',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 16px',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #fff 0%, #cbd5e1 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  message: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#94a3b8',
    textAlign: 'center',
    margin: '0 0 32px',
  },
  buttonContainer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  primaryButton: {
    padding: '14px 32px',
    border: 'none',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: '#fff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 14px -2px rgba(59, 130, 246, 0.5)',
  },
  primaryButtonHover: {
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    transform: 'translateY(-1px)',
    boxShadow: '0 6px 20px -2px rgba(59, 130, 246, 0.6)',
  },
  secondaryButton: {
    padding: '14px 24px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#e2e8f0',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  secondaryButtonHover: {
    background: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  detailsContainer: {
    marginTop: '24px',
    padding: '20px',
    background: 'rgba(15, 23, 42, 0.6)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  detailsSection: {
    marginBottom: '16px',
  },
  detailsTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#64748b',
    margin: '0 0 8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  errorText: {
    fontSize: '13px',
    color: '#f87171',
    margin: '0',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: 'Monaco, "Courier New", monospace',
  },
  stackText: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: '0',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: 'Monaco, "Courier New", monospace',
  },
  footer: {
    marginTop: '32px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0',
  },
};