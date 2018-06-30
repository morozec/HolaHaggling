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
    }
    offer(o){
        this.log(`${this.rounds} rounds left`);
        this.rounds--;
        if (o)
        {
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
			
			for (var i = 0; i < this.values.length; ++i)
			{
				if (o[i] == 0) continue;
				if (this.values[i] < minValue)
				{
					minValue = this.values[i];
					index = i;
				}
			}
			
			o[index]--;	
			
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
				o = this.myLastOffer;
			}
		}
		
		this.myLastOffer = o;
        return o;
    }
};
