import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { PaymentPolicyBuilder } from '../../utils/policy';
import type { Policy } from '../../utils/policy/types';

// Consider if this hook is needed anymore.. Sicne we are using the class directly in ProcessManagerClass

type UsePaymentPolicyResult = {
  getDefaultPaymentPolicy: (taskId: string) => Policy;
};

export const usePaymentPolicy = (): UsePaymentPolicyResult => {
  const { org, app } = useStudioUrlParams();

  const getDefaultPaymentPolicy = (taskId: string): Policy => {
    const paymentPolicyBuilder = new PaymentPolicyBuilder(org, app);
    return paymentPolicyBuilder.getDefaultPaymentPolicy(taskId);
  };

  return {
    getDefaultPaymentPolicy,
  };
};
