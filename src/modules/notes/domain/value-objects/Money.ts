import { ValueObject } from '../../shared/base/ValueObject'

interface MoneyProps {
  value: number
  currency: 'BRL' | 'USD' | 'EUR'
}

export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props)
  }

  static create(value: number, currency: 'BRL' | 'USD' | 'EUR' = 'BRL'): Money {
    if (value < 0) {
      throw new Error('Money cannot be negative')
    }
    return new Money({ value, currency })
  }

  static createBRL(value: number): Money {
    return Money.create(value, 'BRL')
  }

  get value(): number {
    return this.props.value
  }

  get currency(): string {
    return this.props.currency
  }

  format(locale: string = 'pt-BR'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.props.currency,
    }).format(this.props.value)
  }

  add(other: Money): Money {
    if (this.props.currency !== other.props.currency) {
      throw new Error('Cannot add money with different currencies')
    }
    return Money.create(this.props.value + other.props.value, this.props.currency)
  }

  subtract(other: Money): Money {
    if (this.props.currency !== other.props.currency) {
      throw new Error('Cannot subtract money with different currencies')
    }
    return Money.create(Math.max(0, this.props.value - other.props.value), this.props.currency)
  }

  multiply(factor: number): Money {
    return Money.create(this.props.value * factor, this.props.currency)
  }

  isGreaterThan(other: Money): boolean {
    return this.props.value > other.props.value
  }

  equals(other: Money): boolean {
    return this.props.value === other.props.value && this.props.currency === other.props.currency
  }
}