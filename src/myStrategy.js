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
			var suggestedSumValue = this.getOfferSumValue(o);			
			this.log(`suggested sum value: ${suggestedSumValue}`);

			if (this.myLastOffer && suggestedSumValue >= this.getOfferSumValue(this.myLastOffer))
				return;

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
			var hasZeroCounts = false;
			for (let i = 0; i<o.length; i++)
			{
				if (!this.values[i])
				{
					o[i] = 0;
					hasZeroCounts = true;
				}
			}

			if (!hasZeroCounts){ //exclude offer, where enemy get nothing
				o = this.getNewOffer(o);
			}
		}
		else
		{
			o = this.myLastOffer.slice();
			o = this.getNewOffer(o);
		}

		var mySumValue = this.getOfferSumValue(o);		
		this.log(`my sum value: ${mySumValue}`);
		
		this.myLastOffer = o;		
		this.rounds--;
		
		if (suggestedSumValue && mySumValue <= suggestedSumValue)
			return;

        return o;
	}
	
	getNewOffer(o) {

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
			o[this.myLastOfferIndex] = this.counts[this.myLastOfferIndex];
		}
		
		
		o[index]--;	
		
		//if current offer if zero value for me or too cheap, suggest preveous one
		var isBadOffer = this.isZeroOffer(o) || this.isPoorOffer(o);
		
		if (isBadOffer) return this.myLastOffer;			
			
		this.myLastOfferIndex = index;	
		return o;
	}

	isZeroOffer(o){
		for (var i = 0; i < o.length; ++i)		
			if (o[i] > 0)			
				return false;		
		
		return true;
	}

	isPoorOffer(o){
		var sumValue = this.getOfferSumValue(o);
		return sumValue < this.getMaxSumValue() / 2;
	}

	getMaxSumValue(){
		var sum = 0;
		for (var i = 0; i < this.counts.length; ++i)
			sum += this.counts[i] * this.values[i];
		return sum;
	}

	getOfferSumValue(o){
		var sumValue = 0;
		for (var i = 0; i < o.length; ++i){
			sumValue += o[i] * this.values[i];
		}
		return sumValue;
	}
};
