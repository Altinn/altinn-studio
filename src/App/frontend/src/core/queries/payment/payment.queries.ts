export const paymentQueryKeys = {
  informationForInstance: (instanceId: string | undefined) => ['fetchPaymentInfoForTask', instanceId] as const,
  information: (instanceId: string | undefined, language: string, taskId: string | undefined) =>
    [...paymentQueryKeys.informationForInstance(instanceId), language, taskId] as const,
  orderDetailsForInstance: (instanceId: string | undefined) => ['fetchOrderDetails', instanceId] as const,
  orderDetails: (instanceId: string | undefined, language: string) =>
    [...paymentQueryKeys.orderDetailsForInstance(instanceId), language] as const,
};
