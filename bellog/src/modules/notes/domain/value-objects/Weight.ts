import { ValueObject } from '../../shared/base/ValueObject'

interface WeightProps {
  value: number
  unit: 'kg' | 'lb' | 'g'
}

export class Weight extends ValueObject<WeightProps> {
  private constructor(props: WeightProps) {
    super(props)
  }

  static create(value: number, unit: 'kg' | 'lb' | 'g' = 'kg'): Weight {
    if (value < 0) {
      throw new Error('Weight cannot be negative')
    }
    return new Weight({ value, unit })
  }

  static createKg(value: number): Weight {
    return Weight.create(value, 'kg')
  }

  get value(): number {
    return this.props.value
  }

  get unit(): string {
    return this.props.unit
  }

  toKg(): number {
    if (this.props.unit === 'kg') return this.props.value
    if (this.props.unit === 'lb') return this.props.value * 0.453592
    return this.props.value / 1000
  }

  toString(): string {
    return `${this.props.value.toFixed(1)} ${this.props.unit}`
  }

  isGreaterThan(other: Weight): boolean {
    return this.toKg() > other.toKg()
  }

  isLessThan(other: Weight): boolean {
    return this.toKg() < other.toKg()
  }

  equals(other: Weight): boolean {
    return this.toKg() === other.toKg()
  }
}