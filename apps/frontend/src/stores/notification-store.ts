import { defineStore } from 'pinia';
import { ref } from 'vue';

export type NotificationType = 'error' | 'warning' | 'info' | 'success';

export const useNotificationStore = defineStore('notification', () => {
    const show = ref(false);
    const message = ref('');
    const type = ref<NotificationType>('info');

    function showNotification(msg: string, notificationType: NotificationType = 'info') {
        message.value = msg;
        type.value = notificationType;
        show.value = true;
    }

    function showError(msg: string) {
        showNotification(msg, 'error');
    }

    function hide() {
        show.value = false;
    }
    
    return {
        show,
        message,
        type,
        showNotification,
        showError,
        hide 
    };
});
