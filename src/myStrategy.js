'use strict'; /*jslint node:true*/

module.exports = class Agent {
    constructor(me, counts, values, max_rounds, log){
        this.counts = counts;
        this.values = values;
        this.rounds = max_rounds;
        this.log = log;
        this.total = 0;
        for (let i = 0; i<counts.length; i++)
            this.total += counts[i]*values[i];
		
		this.isFirstPlayer = false;
		this.enemyZeroIndexes = []; 
    }
    offer(o){
        this.log(`${this.rounds} rounds left`);
        
        if (o)
        {
			var suggestedSumValue = 0;
			for (var i = 0; i < o.length; ++i)
				suggestedSumValue += o[i] * this.values[i];			
			this.log(`suggested sum value: ${suggestedSumValue}`);

			if (this.rounds == this.max_rounds)
			{
				for (let i = 0; i<o.length; i++){
					if (o[i] == this.counts[i]){
						//enemy don't need this item. Probably is has zero value for him
						this.enemyZeroIndexes.push(i);
					}
				}
			}

			if (!this.isFirstPlayer && this.rounds == 1) 
			{
				let sum = 0;
				for (let i = 0; i<o.length; i++)
					sum += this.values[i]*o[i];
				if (sum>0)
					return;
			}
        }
		else
		{
			this.isFirstPlayer = true;
		}
		
		if (!this.myLastOffer)
		{
			o = this.counts.slice();
			for (let i = 0; i<o.length; i++)
			{
				if (!this.values[i])
					o[i] = 0;
			}
		}
		else
		{
			o = this.myLastOffer.slice();

			var index = -1;
			var minValue = Number.MAX_VALUE;
			
			//find item with minimum value and decrement it in my offer
			for (var i = 0; i < this.values.length; ++i)
			{
				if (o[i] == 0) continue;

				//this item probably has zero value for my enemy
				if (this.enemyZeroIndexes.includes(i)){
					o[i] = this.counts[i];
					continue;		
				}

				if (this.values[i] < minValue)
				{
					minValue = this.values[i];
					index = i;
				}
			}

			if (this.myLastOffer && this.values[this.myLastOfferIndex] < this.values[index]){
				o[this.myLastOfferIndex]++;
			}
			
			this.myLastOfferIndex = index;
			o[index]--;	
			
			//if current offer if zero value for me, suggest preveous one
			var isZeroOffer = true;
			for (var i = 0; i < o.length; ++i)
			{
				if (o[i] > 0)
				{
					isZeroOffer = false;
					break
				}
			}
			if (isZeroOffer)
			{
				this.myLastOfferIndex = null;
				o = this.myLastOffer;
			}
		}

		var mySumValue = 0;
		for (var i = 0; i < o.length; ++i){
			mySumValue += o[i] * this.values[i];
		}
		this.log(`my sum value: ${mySumValue}`);
		
		this.myLastOffer = o;		
		this.rounds--;
        return o;
    }
};
