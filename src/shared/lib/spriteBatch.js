export function drawSpriteItems(items, sprites) {
    const count = items.length;
    sprites.length = count > 1 ? count : 0;
    if (count === 1) {
        items[0].sprite.draw();
    } else if (count > 1) {
        for (let i = 0; i < count; i++) sprites[i] = items[i].sprite;
        Sprite.drawAll(sprites);
    }
}
