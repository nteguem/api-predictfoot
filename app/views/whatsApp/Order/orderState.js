class OrderStateManager {
    constructor() {
        this.orders = new Map();
    }

    initializeOrder(phoneNumber, initialData = {}) {
        this.orders.set(phoneNumber, {
            step: 0,
            data: initialData,
            timestamp: Date.now()
        });
    }

    getCurrentState(phoneNumber) {
        return this.orders.get(phoneNumber);
    }

    updateOrderData(phoneNumber, data) {
        const currentOrder = this.orders.get(phoneNumber);
        if (currentOrder) {
            this.orders.set(phoneNumber, {
                ...currentOrder,
                data: { ...currentOrder.data, ...data },
                timestamp: Date.now()
            });
        }
    }

    setStep(phoneNumber, step) {
        const order = this.orders.get(phoneNumber);
        if (order) {
            order.step = step;
            this.orders.set(phoneNumber, order);
        }
    }

    resetOrder(phoneNumber) {
        const currentOrder = this.orders.get(phoneNumber);
        if (currentOrder) {
            const userData = currentOrder.data.user;
            this.initializeOrder(phoneNumber, { user: userData });
        }
    }
}


module.exports = OrderStateManager;