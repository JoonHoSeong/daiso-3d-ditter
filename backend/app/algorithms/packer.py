import math
from typing import List, Tuple
from ..models.schemas import DaisoProduct, DrawerDimension, FittedItem, SpaceMetrics

class DrawerPacker:
    """
    Column-Grid and Structured drawer organizer layout engine.
    Default: strict unrotated (rotation = 0) placement for clean, showroom-like drawer organization.
    """

    @staticmethod
    def pack(
        drawer: DrawerDimension,
        products: List[DaisoProduct],
        strategy: str = 'balanced',
        allow_rotation: bool = False
    ) -> Tuple[List[FittedItem], SpaceMetrics]:
        # Filter products that do not exceed drawer height
        candidates = [p for p in products if p.height <= drawer.height]
        if not candidates:
            metrics = SpaceMetrics(
                drawer_floor_area=round(drawer.width * drawer.depth, 1),
                occupied_floor_area=0.0,
                floor_utilization=0,
                volume_utilization=0,
                total_price=0,
                item_count=0
            )
            return [], metrics

        scale = 2  # 0.5cm grid scale
        grid_w = int(math.floor(drawer.width * scale))
        grid_d = int(math.floor(drawer.depth * scale))
        occupied = [[False for _ in range(grid_d)] for _ in range(grid_w)]

        def is_free(x: int, z: int, w: int, d: int) -> bool:
            if x + w > grid_w or z + d > grid_d:
                return False
            for ix in range(x, x + w):
                for iz in range(z, z + d):
                    if occupied[ix][iz]:
                        return False
            return True

        def mark_occupied(x: int, z: int, w: int, d: int):
            for ix in range(x, x + w):
                for iz in range(z, z + d):
                    occupied[ix][iz] = True

        # Exclude bulky single-piece cutlery organizers from auto-modular fit unless alone
        modular_candidates = [p for p in candidates if p.id != 'divider-cutlery'] or candidates
        modular_candidates.sort(key=lambda p: p.width * p.depth, reverse=True)

        fitted_items: List[FittedItem] = []

        # 1. Structured column lanes (unrotated)
        cur_x = 0
        while cur_x < grid_w:
            rem_w = grid_w - cur_x
            if rem_w < 8:
                break

            fitting_col = [p for p in modular_candidates if int(round(p.width * scale)) <= rem_w and int(round(p.depth * scale)) <= grid_d]
            if not fitting_col:
                cur_x += 2
                continue

            primary = fitting_col[0]
            col_w = int(round(primary.width * scale))
            lane_prods = [p for p in fitting_col if int(round(p.width * scale)) == col_w]

            cur_z = 0
            placed_in_lane = False
            while cur_z < grid_d:
                rem_d = grid_d - cur_z
                if rem_d < 8:
                    break
                fit_prod = next((p for p in lane_prods if int(round(p.depth * scale)) <= rem_d and is_free(cur_x, cur_z, col_w, int(round(p.depth * scale)))), None)
                if fit_prod:
                    pw = col_w
                    pd = int(round(fit_prod.depth * scale))
                    mark_occupied(cur_x, cur_z, pw, pd)
                    fitted_items.append(
                        FittedItem(
                            instance_id=f"{fit_prod.id}-{len(fitted_items)+1}",
                            product_id=fit_prod.id,
                            product=fit_prod,
                            x=cur_x / scale,
                            y=0.0,
                            z=cur_z / scale,
                            rotation=0
                        )
                    )
                    cur_z += pd
                    placed_in_lane = True
                else:
                    break

            if placed_in_lane:
                cur_x += col_w
            else:
                cur_x += 2

        # 2. Secondary fallback pass
        for z in range(0, grid_d, 2):
            for x in range(0, grid_w, 2):
                if occupied[x][z]:
                    continue

                for prod in modular_candidates:
                    pw = int(round(prod.width * scale))
                    pd = int(round(prod.depth * scale))

                    # 1. Try unrotated (0 deg)
                    if is_free(x, z, pw, pd):
                        mark_occupied(x, z, pw, pd)
                        fitted_items.append(
                            FittedItem(
                                instance_id=f"{prod.id}-{len(fitted_items)+1}",
                                product_id=prod.id,
                                product=prod,
                                x=x / scale,
                                y=0.0,
                                z=z / scale,
                                rotation=0
                            )
                        )
                        break

                    # 2. Try rotated (90 deg) ONLY if explicitly allowed
                    if allow_rotation and is_free(x, z, pd, pw):
                        mark_occupied(x, z, pd, pw)
                        fitted_items.append(
                            FittedItem(
                                instance_id=f"{prod.id}-{len(fitted_items)+1}-rot",
                                product_id=prod.id,
                                product=prod,
                                x=x / scale,
                                y=0.0,
                                z=z / scale,
                                rotation=90
                            )
                        )
                        break

        # Calculate metrics
        floor_area = round(drawer.width * drawer.depth, 1)
        volume = round(drawer.width * drawer.depth * drawer.height, 1)
        occupied_floor = 0.0
        occupied_vol = 0.0
        total_price = 0

        for item in fitted_items:
            w = item.product.depth if item.rotation == 90 else item.product.width
            d = item.product.width if item.rotation == 90 else item.product.depth
            occupied_floor += w * d
            occupied_vol += w * d * item.product.height
            total_price += item.product.price

        floor_util = int(min(100, round((occupied_floor / floor_area) * 100))) if floor_area > 0 else 0
        vol_util = int(min(100, round((occupied_vol / volume) * 100))) if volume > 0 else 0

        metrics = SpaceMetrics(
            drawer_floor_area=floor_area,
            occupied_floor_area=round(occupied_floor, 1),
            floor_utilization=floor_util,
            volume_utilization=vol_util,
            total_price=total_price,
            item_count=len(fitted_items)
        )

        return fitted_items, metrics
