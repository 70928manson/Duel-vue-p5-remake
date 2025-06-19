export class Vector2 {
  constructor(public x: number = 0, public y: number = 0) {}

  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y)
  }

  subtract(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y)
  }

  multiply(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar)
  }

  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }

  magSq(): number {
    return this.x * this.x + this.y * this.y
  }

  normalize(): Vector2 {
    const mag = this.magnitude()
    if (mag === 0) return new Vector2(0, 0)
    return new Vector2(this.x / mag, this.y / mag)
  }

  distance(other: Vector2): number {
    return this.subtract(other).magnitude()
  }

  distanceSq(other: Vector2): number {
    return this.subtract(other).magSq()
  }

  angle(other: Vector2): number {
    return Math.atan2(other.y - this.y, other.x - this.x)
  }

  static fromAngle(angle: number, magnitude: number = 1): Vector2 {
    return new Vector2(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude)
  }

  static random(): Vector2 {
    return Vector2.fromAngle(Math.random() * Math.PI * 2)
  }

  copy(): Vector2 {
    return new Vector2(this.x, this.y)
  }

  set(x: number, y: number): void {
    this.x = x
    this.y = y
  }

  limit(max: number): Vector2 {
    const mag = this.magnitude()
    if (mag > max) {
      return this.normalize().multiply(max)
    }
    return this.copy()
  }
} 