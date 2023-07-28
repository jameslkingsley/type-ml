<?php

readonly class OrderId
{
    public int $value;
}

readonly class LineItemId
{
    public int $value;
}

readonly class Currency
{
    public int $value;
}

readonly class Order
{
    public OrderId $id;
    public Currency $total;
    
    /** @var Set<LineItemId, LineItem> */
    public Set $lineItems;
    
    /** @var Set<int, string> */
    public Set $tags;
}

readonly class LineItem
{
    public LineItemId $id;
    public OrderId $orderId;
    public Currency $amount;
    public string $description;
}