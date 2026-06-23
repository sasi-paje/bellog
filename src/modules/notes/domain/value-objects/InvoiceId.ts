import { ValueObject } from '../../../shared/base/ValueObject'

interface InvoiceIdProps {
  value: string
}

export class InvoiceId extends ValueObject<InvoiceIdProps> {
  private constructor(props: InvoiceIdProps) {
    super(props)
  }

  static create(): InvoiceId {
    return new InvoiceId({ value: crypto.randomUUID() })
  }

  static createFromString(value: string): InvoiceId {
    return new InvoiceId({ value })
  }

  get value(): string {
    return this.props.value
  }
}