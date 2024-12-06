import { type Policy, type Action, type PolicyRule } from '../types';

export class PaymentPolicyBuilder {
  constructor(
    private readonly org: string,
    private readonly app: string,
  ) {}

  public getDefaultPaymentPolicy(taskId: string): Policy {
    return this.buildPaymentPolicy(taskId);
  }

  public getPolicyRuleId(taskId: string): string {
    return this.buildRuleId(taskId);
  }

  private buildPaymentPolicy(taskId: string): Policy {
    return {
      rules: [this.buildPaymentRule(taskId)],
    };
  }

  private buildPaymentRule(taskId: string): PolicyRule {
    return {
      ruleId: this.buildRuleId(taskId),
      description: this.ruleDescription,
      subject: [],
      actions: this.getDefaultActions,
      resources: [this.buildResources(taskId)],
    };
  }

  private get getDefaultActions(): Array<Action> {
    return ['read', 'pay', 'confirm', 'reject'];
  }

  private get ruleDescription(): string {
    return `Rule that defines that user with specified role(s) can pay, reject and confirm for ${this.org}/${this.app} when it is in payment task`;
  }

  private buildRuleId(taskId: string): string {
    return `urn:altinn:resource:app_${this.org}_${this.app}:policyid:1:ruleid:${taskId}`;
  }

  private buildResources(taskId: string): string[] {
    return [
      `urn:altinn:org:${this.org}`,
      `urn:altinn:app:${this.app}`,
      `urn:altinn:task:${taskId}`,
    ];
  }
}
