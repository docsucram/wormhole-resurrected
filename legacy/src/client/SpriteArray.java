package client;
public class SpriteArray
{
    int size;
    int maxElement;
    int emptySlot;
    int elements;
    Sprite[] sprites;
    
    SpriteArray(final int size) {
        this.size = size;
        this.sprites = new Sprite[size];
    }
    
    int add(final Sprite sprite) {
        if (sprite != null) {
            if (++this.elements >= this.size) {
                final Sprite[] sprites = new Sprite[this.size * 2];
                System.arraycopy(this.sprites, 0, sprites, 0, this.size);
                this.sprites = sprites;
                this.size *= 2;
            }
            final int emptySlot = this.emptySlot;
            this.sprites[emptySlot] = sprite;
            while (true) {
                if (this.emptySlot >= this.size) {
                    this.emptySlot = 0;
                }
                else {
                    if (this.sprites[this.emptySlot] == null) {
                        break;
                    }
                    ++this.emptySlot;
                }
            }
            if (this.emptySlot > this.maxElement) {
                this.maxElement = this.emptySlot;
            }
            return emptySlot;
        }
        return -1;
    }
    
    void clear() {
        for (int i = 0; i < this.maxElement; ++i) {
            this.sprites[i] = null;
        }
        final boolean elements = false;
        this.emptySlot = (elements ? 1 : 0);
        this.maxElement = (elements ? 1 : 0);
        this.elements = (elements ? 1 : 0);
    }
    
    void remove(int i) {
        --this.elements;
        this.sprites[i] = null;
        if (i < this.emptySlot) {
            this.emptySlot = i;
        }
        if (i >= this.maxElement) {
            while (i > -1) {
                if (this.sprites[i] != null) {
                    i = this.maxElement;
                    return;
                }
                --i;
            }
        }
    }
}
