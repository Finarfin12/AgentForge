import Swal from 'sweetalert2';

export const AppAlert = {
  error: (msg: string) => Swal.fire({ icon: 'error', title: 'Oops...', text: msg, background: '#18181b', color: '#fff', confirmButtonColor: '#10b981' }),
  success: (msg: string) => Swal.fire({ icon: 'success', title: 'Success!', text: msg, background: '#18181b', color: '#fff', confirmButtonColor: '#10b981' }),
  warning: (msg: string) => Swal.fire({ icon: 'warning', title: 'Wait...', text: msg, background: '#18181b', color: '#fff', confirmButtonColor: '#10b981' }),
  info: (msg: string) => Swal.fire({ icon: 'info', title: 'Info', text: msg, background: '#18181b', color: '#fff', confirmButtonColor: '#10b981' }),
  
  confirm: async (msg: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: msg,
      icon: 'warning',
      showCancelButton: true,
      background: '#18181b',
      color: '#fff',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes',
    });
    return result.isConfirmed;
  },

  prompt: async (title: string, defaultValue: string = '') => {
    const result = await Swal.fire({
      title: title,
      input: 'text',
      inputValue: defaultValue,
      showCancelButton: true,
      background: '#18181b',
      color: '#fff',
      confirmButtonColor: '#10b981',
    });
    if (result.isConfirmed) {
      return result.value;
    }
    return null;
  }
};
