import {
  BoxRenderable,
  parseColor,
  createTextAttributes,
} from "@opentui/core";
import type { BoxOptions, OptimizedBuffer, RenderContext, RGBA } from "@opentui/core";
import { extend } from "@opentui/react";

export interface TitleSegment {
  text: string;
  fg?: string | RGBA;
  bg?: string | RGBA;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
}

interface StyledBoxOptions extends BoxOptions {
  titleSegments?: TitleSegment[];
}

export class StyledBoxRenderable extends BoxRenderable {
  private _titleSegments?: TitleSegment[];

  constructor(ctx: RenderContext, options: StyledBoxOptions) {
    super(ctx, options);
    this._titleSegments = options.titleSegments;
  }

  get titleSegments(): TitleSegment[] | undefined {
    return this._titleSegments;
  }

  set titleSegments(value: TitleSegment[] | undefined) {
    this._titleSegments = value;
    this.requestRender();
  }

  protected override renderSelf(buffer: OptimizedBuffer): void {
    if (!this._titleSegments || this._titleSegments.length === 0) {
      super.renderSelf(buffer);
      return;
    }

    // Draw box without title so we can render styled segments ourselves
    buffer.drawBox({
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      borderStyle: this._borderStyle,
      customBorderChars: this._customBorderChars,
      border: this._border,
      borderColor: this.focused
        ? this._focusedBorderColor
        : this._borderColor,
      backgroundColor: this._backgroundColor,
      shouldFill: this.shouldFill,
    });

    // Only draw segments if top border is enabled
    const hasTopBorder =
      this._border === true ||
      (Array.isArray(this._border) && this._border.includes("top"));
    if (!hasTopBorder) return;

    // Calculate total text width of all segments
    let totalWidth = 0;
    for (const seg of this._titleSegments) {
      totalWidth += seg.text.length;
    }

    const availableWidth = this.width - 4; // 1 border + 1 space on each side
    if (totalWidth > availableWidth || availableWidth <= 0) return;

    // Calculate starting X based on titleAlignment
    let startX: number;
    switch (this._titleAlignment) {
      case "center":
        startX = this.x + Math.floor((this.width - totalWidth) / 2);
        break;
      case "right":
        startX = this.x + this.width - totalWidth - 2;
        break;
      case "left":
      default:
        startX = this.x + 2;
        break;
    }

    // Draw each segment with individual colors/attributes
    let curX = startX;
    for (const seg of this._titleSegments) {
      const fg = seg.fg ? parseColor(seg.fg) : this._borderColor;
      const bg = seg.bg ? parseColor(seg.bg) : undefined;
      const attrs = createTextAttributes({
        bold: seg.bold,
        dim: seg.dim,
        italic: seg.italic,
        underline: seg.underline,
      });
      buffer.drawText(seg.text, curX, this.y, fg, bg, attrs);
      curX += seg.text.length;
    }
  }
}

declare module "@opentui/react" {
  interface OpenTUIComponents {
    "styled-box": typeof StyledBoxRenderable;
  }
}

extend({ "styled-box": StyledBoxRenderable });
