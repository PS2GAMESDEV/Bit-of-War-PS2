const WINDOW_STEP = 32;
const MERGE_GAP = 4;
const CALL_COST = 64;

function lowerBound(values, value) {
    let lo = 0, hi = values.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (values[mid] < value) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

function append(ranges, first, count) {
    const previous = ranges[ranges.length - 1];
    if (previous && first <= previous.first + previous.count + MERGE_GAP) {
        previous.count = first + count - previous.first;
    } else ranges.push({ first, count });
}

export class TileVisibility {
    constructor(groups) {
        this.groups = groups;
        this.ranges = [];
        this.left = this.right = this.top = this.bottom = NaN;
    }

    visibleRanges(view) {
        const left = Math.floor(view.x / WINDOW_STEP) * WINDOW_STEP;
        const right = Math.ceil((view.x + view.w) / WINDOW_STEP) * WINDOW_STEP;
        const top = Math.floor(view.y / WINDOW_STEP) * WINDOW_STEP;
        const bottom = Math.ceil((view.y + view.h) / WINDOW_STEP) * WINDOW_STEP;
        if (left === this.left && right === this.right && top === this.top && bottom === this.bottom) return this.ranges;
        this.left = left; this.right = right; this.top = top; this.bottom = bottom;
        const ranges = this.ranges;
        ranges.length = 0;

        for (const group of this.groups) {
            const from = lowerBound(group.xs, left - group.reach);
            const to = lowerBound(group.xs, right);
            if (to <= from) continue;
            const spans = [];
            for (let i = from; i < to; i++) {
                if (group.ys[i] + group.height < top || group.ys[i] > bottom) continue;
                append(spans, group.first + i, 1);
            }
            let count = 0;
            for (const span of spans) count += span.count;
            if (spans.length && count + CALL_COST * spans.length > to - from + CALL_COST) {
                append(ranges, group.first + from, to - from);
            } else {
                for (const span of spans) append(ranges, span.first, span.count);
            }
        }
        return ranges;
    }
}
