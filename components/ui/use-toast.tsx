import toast, { Toast, ToastOptions } from 'react-hot-toast';

type ToastProps = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
};

const useToast = () => {
  const showToast = ({ title, description, variant = 'default' }: ToastProps) => {
    const options: ToastOptions = {
      duration: 3000,
      position: 'bottom-right',
    };

    if (variant === 'destructive') {
      options.style = {
        background: '#ef4444',
        color: '#fff',
      };
    }

    const content = (
      <div>
        {title && <strong>{title}</strong>}
        {description && <p>{description}</p>}
      </div>
    );

    return toast(content, options);
  };

  return { toast: showToast };
};

export { useToast, type Toast };
